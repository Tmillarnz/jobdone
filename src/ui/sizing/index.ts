import { createElement } from 'preact';
import { checkExtras, jobExtras, sizers } from '../slots';
import { Draw } from './Draw';
import { Photos } from './Photos';
import { PlanDiagram } from './PlanDiagram';
import { Talk } from './Talk';

/** Plug the sizing methods beyond Type, and photos, into the shell. */
export function installSizing(): void {
  sizers.push(Draw, Talk);
  jobExtras.push(Photos);
  checkExtras.push(({ area }) => (area.plan?.length ? createElement(PlanDiagram, { rects: area.plan }) : null));
}
