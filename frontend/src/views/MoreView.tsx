import { BOTTOM_NAV_IDS, NAV_ITEMS, toHash } from '../lib/nav/nav.js';
import { Icon } from '../components/ui/Icon.js';

/** Mobile "More" destination: everything that is not in the bottom bar. */
export const MoreView = () => (
  <div className="stack-lg">
    <h1 className="page-title">More</h1>
    <ul className="more-list card">
      {NAV_ITEMS.filter((item) => !BOTTOM_NAV_IDS.includes(item.id)).map((item) => (
        <li key={item.id}>
          <a href={toHash(item.id)} className="more-link">
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <Icon name="arrowRight" size={18} />
          </a>
        </li>
      ))}
    </ul>
  </div>
);
