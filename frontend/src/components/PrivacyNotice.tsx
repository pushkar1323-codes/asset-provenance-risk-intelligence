export const PrivacyNotice = () => (
  <section className="panel" aria-label="Privacy information">
    <h2>What stays private</h2>
    <p>
      The Asset Passport contract only ever writes commitments and status flags to the public
      ledger. The identifier below is hashed before submission, but is not itself treated as
      sensitive - what the contract protects is ownership key material, credential contents, and
      provenance details, none of which this form collects.
    </p>
    <ul>
      <li>Your ownership key is generated in your browser and never leaves it.</li>
      <li>The contract stores a commitment derived from that key, not the key itself.</li>
      <li>
        This is a property of the Compact contract's zero-knowledge design, not of how this page
        happens to store data.
      </li>
    </ul>
  </section>
);
