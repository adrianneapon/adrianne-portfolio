import React from 'react';

const groups = [
  { name: 'UX', description: 'The structure, flow and overall experience.', terms: ['Research', 'User Flow', 'User Goals', 'Business Goals', 'Information Architecture', 'Wireframes'] },
  { name: 'UI', description: 'The look, feel and visual design of the product.', terms: ['Typography', 'Color Scheme', 'Visual Hierarchy', 'Visual Design', 'Spacing', 'Consistency'] },
];

export default function SurroundingText({ introRef, sidesRef }) {
  return <>
    <div ref={introRef} className="uiux-text-intro">
      <h2>WHERE <em>UX</em> MEETS <em>UI.</em></h2>
      <p>UX defines the journey. UI brings it to life.</p>
    </div>
    <div ref={sidesRef} className="uiux-text-sides">
      {groups.map(group => <div key={group.name} className={`uiux-text-group uiux-text-${group.name.toLowerCase()}`}>
        <h3>{group.name}</h3>
        <h4>USER EXPERIENCE</h4>
        <p>{group.description}</p>
        <ul>{group.terms.map(term => <li key={term}>{term}</li>)}</ul>
      </div>)}
    </div>
  </>;
}
