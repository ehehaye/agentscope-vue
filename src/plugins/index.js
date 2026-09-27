import Vue from 'vue';
import setupCompositionApi from './composition-api';
import setupElement from './element';
import '../components/iconify/index';

setupCompositionApi(Vue);
setupElement(Vue);