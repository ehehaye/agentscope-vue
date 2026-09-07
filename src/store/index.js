import Vue from 'vue';
import Vuex from 'vuex';
import app from './modules/app';
import workspace from './modules/workspace';
import chat from './modules/chat';
import upload from './modules/upload';

Vue.use(Vuex);

// upload 随 Phase 5 加入（02 §4）。
export default new Vuex.Store({
  modules: {
    app,
    workspace,
    chat,
    upload,
  },
});
