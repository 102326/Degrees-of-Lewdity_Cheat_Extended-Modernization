import test from 'node:test';
import assert from 'node:assert/strict';
import { host } from './hooks-host.mjs';

for (const type of ['RawHook', 'VarHook']) {
  function register(c) {
    const options = { owner: 'review', transform: ctx => ctx.newValue };
    if (type === 'VarHook') c[type].register('sample.x', 1, 1, options);
    else c[type].register('sample.x', options);
    c[type].installAll();
  }
  test(`${type}: A-B-same A rebind retains the latest value and retires the old setter`, () => {
    const { c } = host();
    const a = { x: 1 }, b = { x: 2 };
    c.V.sample = a; register(c);
    const old = Object.getOwnPropertyDescriptor(a, 'x').set;
    let effects = 0;
    c[type].on('sample.x', () => effects++);
    c.V.sample = b; c[type].installAll();
    c.V.sample = a; c[type].installAll();
    a.x = 9;
    old.call(a, 30);
    assert.equal(effects, 1);
    assert.equal(a.x, 9);
    c[type].unregisterOwner('review');
    assert.equal(a.x, 9);
    assert.equal(Object.getOwnPropertyDescriptor(a, 'x').set, undefined);
  });
  for (const change of ['getter', 'enumerable', 'configurable', 'replacement', 'none']) {
    test(`${type}: release preserves third-party ${change} descriptor ownership`, () => {
      const { c } = host(); let effects = 0;
      c.V.sample = { x: 1 }; register(c);
      c[type].on('sample.x', () => effects++);
      c.V.sample.x = 8;
      const own = Object.getOwnPropertyDescriptor(c.V.sample, 'x');
      const changed = { ...own };
      if (change === 'getter') changed.get = () => 73;
      if (change === 'enumerable') changed.enumerable = !own.enumerable;
      if (change === 'configurable') changed.configurable = false;
      if (change === 'replacement') { changed.get = () => 91; changed.set = () => {}; }
      Object.defineProperty(c.V.sample, 'x', changed);
      c[type].unregisterOwner('review');
      if (change === 'none') {
        assert.equal(c.V.sample.x, 8);
        assert.equal(Object.getOwnPropertyDescriptor(c.V.sample, 'x').set, undefined);
      } else assert.deepEqual(Object.getOwnPropertyDescriptor(c.V.sample, 'x'), changed);
      own.set.call(c.V.sample, 10);
      assert.equal(effects, 1);
    });
  }
}
