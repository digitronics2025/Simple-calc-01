import './styles.css';
import { mountCalculator } from './ui/app';

const root = document.querySelector<HTMLElement>('[data-calculator]');
if (!root) throw new Error('Calculator root element is missing');
mountCalculator(root);
