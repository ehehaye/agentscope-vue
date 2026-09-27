import Vue from 'vue';
import setupCompositionApi from './composition-api';
import setupElement from './element';
import './iconify';

setupCompositionApi(Vue);
setupElement(Vue);