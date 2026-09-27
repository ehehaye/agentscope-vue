import setupCompositionApi from './composition-api';
import setupElement from './element';
import './fonts';
import './styles';

export default function setupPlugins(Vue) {
  setupCompositionApi(Vue);
  setupElement(Vue);
}