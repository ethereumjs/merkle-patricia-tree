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
  }

  /**
   * Executes the task.
   * @private
   * @param priority The priority of the task
   * @param fn The function that accepts the callback, which must be called upon the task completion.
   */
  execute(priority: number, fn: Function) {
    if (this.currentPoolSize < this.maxPoolSize) {
      this.currentPoolSize++
      fn(() => {
        this.currentPoolSize--
        if (this.queue.length > 0) {
          const item = this.queue.shift()
          this.execute(item!.priority, item!.fn)
        }
      })
    } else {
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
          let index = mid()
          let value = this.queue[index].priority
          console.log(left, right, index, value)
          if (value == priority) {
            this.queue.splice(index, 0, { priority, fn })
            break
          }
          if (left == right) {
            this.queue.splice(left, 0, { priority, fn })
            break
          }

          if (value > priority) {
            left = index
          } else {
            right = index
          }
        }
      }
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
