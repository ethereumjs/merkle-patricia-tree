import * as tape from 'tape'
import { PrioritizedTaskExecutor } from '../src/prioritizedTaskExecutor'

tape('prioritized task executor test', function (t: any) {
  t.test('should execute tasks in the right order', (st: any) => {
    const taskExecutor = new PrioritizedTaskExecutor(2)
    const tasks = [1, 2, 3, 4]
    const callbacks = [] as any
    const executionOrder = [] as any
    tasks.forEach(function (task) {
      taskExecutor.execute(task, function (cb: Function) {
        executionOrder.push(task)
        callbacks.push(cb)
      })
    })

    callbacks.forEach(function (callback: Function) {
      callback()
    })

    const expectedExecutionOrder = [1, 2, 4, 3]
    st.deepEqual(executionOrder, expectedExecutionOrder)
    st.end()
  })

  t.test('should queue tasks in the right order', (st: any) => {
    const priorityList = [0, 1, 0, 2, 0, 1, 0, 2, 2, 1]
    const PTE = new PrioritizedTaskExecutor(0) // this ensures that no task actually gets executed, so this essentially just checks the sort algorithm
    priorityList.map((priority) => {
      PTE.execute(priority, () => {})
    })
    // have to cast the PTE as <any> to access the private queue
    st.deepEqual(
      (<any>PTE).queue.map((task: any) => task.priority),
      priorityList.sort((a: any, b: any) => b - a),
    )
    st.end()
  })
})
