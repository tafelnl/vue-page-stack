import mixinFunction from '../../src/mixin';
import history from '../../src/history';
import config from '../../src/config/config';
import VueRouter from 'vue-router';
import { createLocalVue } from '@vue/test-utils'

const localVue = createLocalVue()
localVue.use(VueRouter)
const router = new VueRouter()

describe('mixin', () => {
  mixinFunction(router);
  test('push', () => {
    router.push('/router');
    expect(history.action).toBe(config.pushName);
  })

  test('replace', () => {
    router.replace('/replace');
    expect(history.action).toBe(config.replaceName);
  })

  test('go', () => {
    router.go(-1);
    expect(history.action).toBe(config.goName);
  })

  test('forward', () => {
    router.forward();
    expect(history.action).toBe(config.goName);
  })

  test('back', () => {
    router.back();
    expect(history.action).toBe(config.goName);
  })
})
