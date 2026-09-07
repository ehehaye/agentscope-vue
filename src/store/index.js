import Vue from 'vue';
import Vuex from 'vuex';
import app from './modules/app';
import workspace from './modules/workspace';
import chat from './modules/chat';
import upload from './modules/upload';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    app,
    workspace,
    chat,
    upload,
  },
});
