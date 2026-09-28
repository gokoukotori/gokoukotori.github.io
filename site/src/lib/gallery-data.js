import content from '../data/content.json' with { type: 'json' };
import originalPhotos from '../data/gallery.json';
import { publicGallery } from './media-library.js';
export default publicGallery(content, originalPhotos);
