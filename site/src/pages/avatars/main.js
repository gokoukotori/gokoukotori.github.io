import { mount } from 'svelte';
import '../../app.css';
import Avatars from './Avatars.svelte';

export default mount(Avatars, { target: document.getElementById('app') });
