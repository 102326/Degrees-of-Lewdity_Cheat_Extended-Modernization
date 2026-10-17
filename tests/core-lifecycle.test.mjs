import test from 'node:test';
import assert from 'node:assert/strict';
import { host } from './hooks-host.mjs';

for (const type of ['VarHook', 'RawHook', 'DeepProxyHook']) {
  test(`${type}: owner release preserves other rules and retires the removed generation`, () => {
    const { c } = host();
    c.V.sample = type === 'DeepProxyHook' ? { value: 1 } : 1;
    const trace = [];
    const register = (owner, factor) => {
      const options = { owner, transform(ctx) { trace.push(owner); return ctx.newValue * factor; } };
      if (type === 'VarHook') c[type].register('sample', 1, 1, options);
      else c[type].register('sample', options);
      c[type].installAll();
    };
    const write = value => { if (type === 'DeepProxyHook') c.V.sample.value = value; else c.V.sample = value; };
    const read = () => type === 'DeepProxyHook' ? c.V.sample.value : c.V.sample;
    register('a', 2);
    register('b', 3);
    write(2); assert.equal(read(), 6);
    const stale = c.V.sample;
    c[type].unregisterOwner('b');
    write(3); assert.equal(read(), 6);
    assert.deepEqual(trace, ['b', 'a']);
    c[type].unregisterOwner('a');
    write(4); assert.equal(read(), 4);
    if (type === 'DeepProxyHook') {
      stale.value = 7;
      assert.equal(read(), 7);
      assert.equal(c.V.sample, c.CE_hookIdentity.raw(c.V.sample));
    } else assert.equal(Object.getOwnPropertyDescriptor(c.V, 'sample').set, undefined);
    assert.deepEqual(trace, ['b', 'a']);
  });
}

for (const type of ['VarHook', 'RawHook']) {
  test(`${type}: cleanup preserves flags and respects later third-party ownership`, () => {
    const { c } = host();
    Object.defineProperty(c.V, 'sample', { value: 1, writable: true, configurable: true, enumerable: false });
    const register = () => {
      if (type === 'VarHook') c[type].register('sample', 2, 2, { owner: 'test' });
      else c[type].register('sample', { owner: 'test', transform: ctx => ctx.newValue * 2 });
      c[type].installAll();
    };
    register(); c.V.sample = 3;
    c[type].unregisterOwner('test');
    assert.deepEqual(Object.getOwnPropertyDescriptor(c.V, 'sample'), {
      value: type === 'VarHook' ? 5 : 6, writable: true, configurable: true, enumerable: false,
    });
    register();
    const setter = () => {};
    Object.defineProperty(c.V, 'sample', { get: () => 99, set: setter, configurable: true });
    c[type].unregisterOwner('test');
    assert.equal(Object.getOwnPropertyDescriptor(c.V, 'sample').set, setter);
    assert.equal(c.V.sample, 99);
  });

  test(`${type}: listeners can be removed without a callback leak`, () => {
    const { c } = host();
    c.V.sample = 1;
    if (type === 'VarHook') c[type].register('sample', 1, 1);
    else c[type].register('sample');
    c[type].installAll();
    const trace = [];
    const off = c[type].on('sample', () => trace.push('removed'));
    c[type].on('sample', () => trace.push('kept'));
    c.V.sample = 2;
    off(); off();
    c.V.sample = 3;
    assert.deepEqual(trace, ['removed', 'kept', 'kept']);
  });
}

test('DeepProxy retires a detached nested child without retiring the live root', () => {
  const { c } = host();
  c.V.sample = { child: { value: 1 } };
  const trace = [];
  c.DeepProxyHook.register('sample', {
    transform(ctx) { trace.push(`transform:${ctx.fullPath}`); return ctx.newValue; },
    after(old, value, ctx) { trace.push(`after:${ctx.fullPath}`); },
    delete() { trace.push('delete'); return false; },
  });
  c.DeepProxyHook.installAll();
  const stale = c.V.sample.child;
  c.V.sample.child = { value: 2 };
  trace.length = 0;
  stale.value = 3;
  assert.equal(Reflect.deleteProperty(stale, 'value'), true);
  assert.deepEqual(trace, []);
  c.V.sample.child.value = 4;
  assert.equal(c.V.sample.child.value, 4);
  assert.deepEqual(trace, ['transform:sample.child.value', 'after:sample.child.value']);
});

test('DeepProxy after runs only for a committed write', () => {
  const { c } = host();
  c.V.sample = {};
  Object.defineProperty(c.V.sample, 'value', { value: 1, configurable: true, writable: false });
  const trace = [];
  c.DeepProxyHook.register('sample', {
    before() { trace.push('before'); },
    transform(ctx) { trace.push('transform'); return ctx.newValue; },
    after() { trace.push('after'); },
  });
  c.DeepProxyHook.installAll();
  assert.equal(Reflect.set(c.V.sample, 'value', 2), false);
  assert.equal(c.V.sample.value, 1);
  assert.deepEqual(trace, ['before', 'transform']);
});

for (const type of ['VarHook', 'RawHook', 'DeepProxyHook']) {
  test(`${type}: stage order, callback count and exception isolation remain explicit`, () => {
    const h = host(); const { c } = h;
    c.V.sample = type === 'DeepProxyHook' ? { value: 1 } : 1;
    const trace = [];
    let throws = false;
    const options = {
      before() { trace.push('before'); throw Error('before isolated'); },
      transform(ctx) { trace.push('transform'); if (throws) throw Error('transform isolated'); return ctx.newValue * 2; },
      after() { trace.push('after'); throw Error('after isolated'); },
    };
    if (type === 'VarHook') c[type].register('sample', 1, 1, options);
    else c[type].register('sample', options);
    c[type].installAll();
    if (type !== 'DeepProxyHook') c[type].on('sample', () => trace.push('event'));
    const write = value => type === 'DeepProxyHook'
      ? Reflect.set(c.V.sample, 'value', value) : Reflect.set(c.V, 'sample', value);
    const read = () => type === 'DeepProxyHook' ? c.V.sample.value : c.V.sample;
    assert.equal(write(2), true);
    assert.equal(read(), 4);
    assert.deepEqual(trace, type === 'DeepProxyHook' ? ['before', 'transform', 'after'] : ['before', 'transform', 'after', 'event']);
    trace.length = 0;
    throws = true;
    assert.equal(write(3), type !== 'DeepProxyHook');
    assert.equal(read(), type === 'DeepProxyHook' ? 4 : 3);
    assert.deepEqual(trace, ['before', 'transform']);
    assert.equal(h.warnings.length, 4);
  });
}
