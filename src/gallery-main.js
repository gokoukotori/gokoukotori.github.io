import { mount } from 'svelte';
import './app.css';
import Gallery from './Gallery.svelte';

const gallery = mount(Gallery, {
  target: document.getElementById('app'),
});

export default gallery;
