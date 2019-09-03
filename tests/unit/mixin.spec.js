import mixinFunction from '../../src/mixin';
import history from '../../src/history';
import config from '../../src/config/config';
import VueRouter from 'vue-router';
import { createLocalVue } from '@vue/test-utils'

const localVue = createLocalVue()
localVue.use(VueRouter)
const router = new VueRouter()

describe('mixin', () => {
  test('push', () => {
    mixinFunction(router);
    router.push('/router');
    expect(history.action).toBe(config.pushName);
  })

  test('replace', () => {
    mixinFunction(router);
    router.replace('/replace');
    expect(history.action).toBe(config.replaceName);
  })

  test('go', () => {
    mixinFunction(router);
    router.go(-1);
    expect(history.action).toBe(config.goName);
  })

  test('forward', () => {
    mixinFunction(router);
    router.forward();
    expect(history.action).toBe(config.forwardName);
  })

  test('back', () => {
    mixinFunction(router);
    router.back();
    expect(history.action).toBe(config.backName);
  })
})
