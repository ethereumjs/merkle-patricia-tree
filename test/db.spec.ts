import * as tape from 'tape'
import { DB, BatchDBOp } from '../src/db'

tape('DB basic functionality', (t) => {
  const db = new DB()

  const k = Buffer.from('foo')
  const v = Buffer.from('bar')

  t.test('puts and gets value', (st) => {
    db.put(k, v)
    const res = db.get(k)
    st.ok(v.equals(res!))
    st.end()
  })

  t.test('dels value', (st) => {
    db.del(k)
    const res = db.get(k)
    st.notOk(res)
    st.end()
  })

  t.test('batch ops', (st) => {
    const k2 = Buffer.from('bar')
    const v2 = Buffer.from('baz')
    const ops = [
      { type: 'put', key: k, value: v },
      { type: 'put', key: k2, value: v2 },
    ] as BatchDBOp[]
    db.batch(ops)
    const res = db.get(k2)
    st.ok(v2.equals(res!))
    st.end()
  })
})
