import Semaphore from 'semaphore-async-await'

interface Task {
  priority: number
  fn: Function
}

export class PrioritizedTaskExecutor {
  /** The maximum size of the pool */
  private maxPoolSize: number
  /** The current size of the pool */
  private currentPoolSize: number
  /** The task queue */
  private queue: Task[]
  /** The Lock */
  private lock: Semaphore

  /**
   * Executes tasks up to maxPoolSize at a time, other items are put in a priority queue.
   * @class PrioritizedTaskExecutor
   * @private
   * @param maxPoolSize The maximum size of the pool
   */
  constructor(maxPoolSize: number) {
    this.maxPoolSize = maxPoolSize
    this.currentPoolSize = 0
    this.queue = []
    this.lock = new Semaphore(1)
  }

  /**
   * Executes the task.
   * @private
   * @param priority The priority of the task
   * @param fn The function that accepts the callback, which must be called upon the task completion.
   */
  async execute(priority: number, fn: Function) {
    let self = this
    function runTask() {
      self.currentPoolSize++
      fn(async () => {
        self.currentPoolSize--
        if (self.queue.length > 0) {
          const item = self.queue.shift()
          await self.execute(item!.priority, item!.fn)
        }
      })
    }
    if (this.currentPoolSize < this.maxPoolSize) {
      runTask()
    } else {
      await this.lock.wait()
      if (this.queue.length == 0) {
        this.queue.push({ priority, fn })
      } else {
        // insert the item in the queue using binary search
        let left = 0
        let right = this.queue.length
        let mid = () => {
          return Math.floor(left + (right - left) / 2)
        }
        while (true) {
          // note that there is a special case: it could be that during sorting, a Task is finished (reducing currentPoolSize by 1), but this Task was not yet inserted
          // therefore, if we want to insert the item we explicitly check that we indeed should Queue it, if not, we execute it and do not insert it.
          let index = mid()
          let value = this.queue[index].priority
          if (value == priority) {
            if (this.currentPoolSize < this.maxPoolSize) {
              runTask()
            } else {
              this.queue.splice(index, 0, { priority, fn })
            }
            break
          }
          if (left == right) {
            if (this.currentPoolSize < this.maxPoolSize) {
              runTask()
            } else {
              this.queue.splice(left, 0, { priority, fn })
            }
            break
          }

          if (value > priority) {
            left = index
          } else {
            right = index
          }
        }
      }
      this.lock.signal()
    }
  }

  /**
   * Checks if the taskExecutor is finished.
   * @private
   * @returns Returns `true` if the taskExecutor is finished, otherwise returns `false`.
   */
  finished(): boolean {
    return this.currentPoolSize === 0
  }
}
