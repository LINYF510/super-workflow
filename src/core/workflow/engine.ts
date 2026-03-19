/**
 * Workflow Engine
 * 
 * 工作流执行引擎
 */

import type { WorkflowStep, WorkflowContext } from '../../types/index.js';
import { parseWorkflow, type ParsedWorkflow } from './parser.js';
import { executeStep, type StepOutput } from './executor.js';
import { CheckpointRepository, TaskRepository } from '../../services/storage/index.js';

/** 执行状态 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

/** 执行结果 */
export interface ExecutionResult {
  status: ExecutionStatus;
  outputs: Record<string, unknown>;
  error?: string;
  completedSteps: string[];
  failedStep?: string;
}

/** 执行选项 */
export interface ExecutionOptions {
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** 检查点保存间隔（步骤数） */
  checkpointInterval?: number;
  /** 是否从检查点恢复 */
  resumeFromCheckpoint?: string;
}

/**
 * WorkflowEngine 类
 */
export class WorkflowEngine {
  private workflow: ParsedWorkflow;
  private context: WorkflowContext;
  private taskRepo: TaskRepository;
  private checkpointRepo: CheckpointRepository;
  private status: ExecutionStatus;
  private completedSteps: Set<string>;
  
  constructor(workflowYaml: string, context: Omit<WorkflowContext, 'stepOutputs' | 'currentStepIndex' | 'variables'>) {
    this.workflow = parseWorkflow(workflowYaml);
    this.context = {
      ...context,
      stepOutputs: new Map(),
      currentStepIndex: 0,
      variables: new Map(),
    };
    this.taskRepo = new TaskRepository();
    this.checkpointRepo = new CheckpointRepository();
    this.status = 'pending';
    this.completedSteps = new Set();
  }
  
  /**
   * 执行工作流
   */
  async execute(options: ExecutionOptions = {}): Promise<ExecutionResult> {
    this.status = 'running';
    
    // 更新任务状态
    this.taskRepo.startTask(this.context.taskId);
    
    try {
      // 恢复检查点
      if (options.resumeFromCheckpoint) {
        await this.restoreCheckpoint(options.resumeFromCheckpoint);
      }
      
      // 执行步骤
      let currentStep = this.getNextStep();
      
      while (currentStep && this.status === 'running') {
        // Store the current step in a const to satisfy TypeScript
        const step = currentStep;
        
        try {
          // 执行步骤
          const output = await executeStep(step, this.context);
          
          // 保存输出
          this.context.stepOutputs.set(step.id, output);
          this.completedSteps.add(step.id);
          
          // 保存检查点
          if (options.enableCheckpoints) {
            await this.saveCheckpoint();
          }
          
          // 获取下一步
          currentStep = this.getNextStep(step, output);
          
        } catch (error) {
          // 处理步骤失败
          return this.handleStepFailure(step, error as Error);
        }
      }
      
      // 完成
      this.status = 'completed';
      const outputs = this.collectOutputs();
      
      this.taskRepo.completeTask(this.context.taskId, outputs);
      
      return {
        status: 'completed',
        outputs,
        completedSteps: Array.from(this.completedSteps),
      };
      
    } catch (error) {
      this.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.taskRepo.failTask(this.context.taskId, errorMessage);
      
      return {
        status: 'failed',
        outputs: {},
        error: errorMessage,
        completedSteps: Array.from(this.completedSteps),
      };
    }
  }
  
  /**
   * 获取下一个步骤
   */
  private getNextStep(currentStep?: WorkflowStep, output?: StepOutput): WorkflowStep | null {
    if (!currentStep) {
      // 从第一个步骤开始
      return this.workflow.steps[0] ?? null;
    }
    
    // 条件分支
    if (currentStep.condition && output !== undefined) {
      const conditionResult = output._conditionResult;
      const nextStepId = conditionResult ? currentStep.onTrue : currentStep.onFalse;
      if (nextStepId) {
        return this.workflow.steps.find((s) => s.id === nextStepId) ?? null;
      }
    }
    
    // 指定下一步
    if (currentStep.next) {
      return this.workflow.steps.find((s) => s.id === currentStep.next) ?? null;
    }
    
    // 顺序执行
    const currentIndex = this.workflow.steps.findIndex((s) => s.id === currentStep.id);
    return this.workflow.steps[currentIndex + 1] ?? null;
  }
  
  /**
   * 处理步骤失败
   */
  private handleStepFailure(step: WorkflowStep, error: Error): ExecutionResult {
    // TODO: 实现重试逻辑 based on this.workflow.errorHandling
    if (step.onFailure === 'retry') {
      // TODO: 实现重试逻辑
    }
    
    this.status = 'failed';
    this.taskRepo.failTask(this.context.taskId, error.message);
    
    return {
      status: 'failed',
      outputs: {},
      error: error.message,
      completedSteps: Array.from(this.completedSteps),
      failedStep: step.id,
    };
  }
  
  /**
   * 保存检查点
   */
  private async saveCheckpoint(): Promise<void> {
    this.checkpointRepo.create({
      taskId: this.context.taskId,
      stepIndex: this.context.currentStepIndex,
      state: this.context,
    });
  }
  
  /**
   * 恢复检查点
   */
  private async restoreCheckpoint(checkpointId: string): Promise<void> {
    const checkpoint = this.checkpointRepo.findById(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }
    
    this.context = checkpoint.state;
    this.context.currentStepIndex++;
  }
  
  /**
   * 收集输出
   */
  private collectOutputs(): Record<string, unknown> {
    const outputs: Record<string, unknown> = {};
    
    for (const output of this.workflow.outputs) {
      // 从上下文中获取输出值
      const value = this.context.variables.get(output.name);
      if (value !== undefined) {
        outputs[output.name] = value;
      }
    }
    
    return outputs;
  }
  
  /**
   * 暂停执行
   */
  pause(): void {
    this.status = 'paused';
    this.taskRepo.pauseTask(this.context.taskId);
  }
  
  /**
   * 恢复执行
   */
  resume(): void {
    this.status = 'running';
    this.taskRepo.resumeTask(this.context.taskId);
  }
  
  /**
   * 取消执行
   */
  cancel(): void {
    this.status = 'cancelled';
    this.taskRepo.cancelTask(this.context.taskId);
  }
  
  /**
   * 获取当前状态
   */
  getStatus(): ExecutionStatus {
    return this.status;
  }
  
  /**
   * 获取上下文
   */
  getContext(): WorkflowContext {
    return this.context;
  }
}
