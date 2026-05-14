// Inlined "Success" page served by AmisuingMiddleware when a request to
// amiusing.requestly.io flows through the Requestly desktop proxy. Mirrors
// the existing two-column amiusing.requestly.io "Yes" design.

export const AMIUSING_YES_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Am I Using Requestly | Requestly - Intercept &amp; Modify HTTP(s) Requests</title>
  <meta name="description" content="Requestly allows you to Intercept &amp; Modify network requests. Main features include Modifying headers, Setting up redirects, Switch hosts, inserting custom scripts and much more">
  <link href="https://fonts.googleapis.com/css?family=Nunito+Sans" rel="stylesheet">
  <script type="application/json" id="amiusing">{"amiusing": true}</script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    .container { font-family: "Nunito Sans", sans-serif; min-height: 100vh; }
    .grid { display: grid; grid-template-columns: 1fr; }
    @media (min-width: 768px) { .grid { grid-template-columns: 1fr 1fr; } }
    .success, .next {
      display: flex; flex-direction: column; justify-content: center;
      padding: 1rem; min-height: 50vh;
    }
    @media (min-width: 768px) {
      .success, .next { padding: 2rem; min-height: 100vh; }
    }
    .success { background: #0648b3; color: #fff; text-align: center; }
    @media (min-width: 768px) { .success { text-align: right; } }
    .success h1 {
      font-size: 2rem; display: flex; align-items: center; justify-content: center;
    }
    @media (min-width: 768px) {
      .success h1 { font-size: 3.2rem; justify-content: flex-end; }
    }
    .success a { color: #fff; font-weight: 800; }
    .success svg { width: 2rem; margin-right: 0.8rem; }
    @media (min-width: 768px) { .success svg { width: 3rem; } }
    .info { margin-top: 2rem; }
    p + p { margin-top: 0.8rem; }
    .next h2 { font-size: 1.5rem; color: #0648b3; }
    @media (min-width: 768px) { .next h2 { font-size: 2rem; } }
    .next .options {
      margin-top: 2rem; display: flex; flex-direction: column; align-items: flex-start;
    }
    .next a { color: #0648b3; font-weight: 800; }
    .next a::before { content: "-"; padding-right: 0.4rem; }
    .next a:hover { color: #0648b3c4; }
    a + a { margin-top: 0.6rem; }
    @media (max-width: 767px) {
      .next .options { align-items: stretch; }
      .next a { padding: 0.5rem 0; word-wrap: break-word; }
      .info { margin-top: 1rem; }
      .info p { font-size: 0.95rem; line-height: 1.5; }
    }
    @media (max-width: 480px) {
      .success h1 { font-size: 1.5rem; }
      .next h2 { font-size: 1.2rem; }
      .success svg { width: 1.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="grid">
      <div class="success">
        <h1>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff">
            <g data-name="Layer 2">
              <g data-name="checkmark-circle">
                <rect width="24" height="24" opacity="0"></rect>
                <path d="M9.71 11.29a1 1 0 0 0-1.42 1.42l3 3A1 1 0 0 0 12 16a1 1 0 0 0 .72-.34l7-8a1 1 0 0 0-1.5-1.32L12 13.54z"></path>
                <path d="M21 11a1 1 0 0 0-1 1 8 8 0 0 1-8 8A8 8 0 0 1 6.33 6.36 7.93 7.93 0 0 1 12 4a8.79 8.79 0 0 1 1.9.22 1 1 0 1 0 .47-1.94A10.54 10.54 0 0 0 12 2a10 10 0 0 0-7 17.09A9.93 9.93 0 0 0 12 22a10 10 0 0 0 10-10 1 1 0 0 0-1-1z"></path>
              </g>
            </g>
          </svg>
          Success
        </h1>
        <div class="info">
          <p>Your internet traffic is now successfully being transferred through Requestly.</p>
          <p>
            In case you're having trouble accessing HTTPS Website, refer to our troubleshooting guide
            <a href="https://docs.requestly.io/desktop-app/troubleshooting" target="_blank" rel="noreferrer noopener">here</a>.
          </p>
        </div>
      </div>
      <div class="next">
        <h2>What's next you ask ?</h2>
        <div class="options">
          <a href="https://docs.requestly.com/general/getting-started--introduction" target="_blank" rel="noreferrer noopener">Getting started</a>
          <a href="https://docs.requestly.com/general/advanced-usage/rule-operators" target="_blank" rel="noreferrer noopener">Understanding Rule Operators</a>
          <a href="https://docs.requestly.com/general/rule-types/modify-headers" target="_blank" rel="noreferrer noopener">Modify HTTP(s) Headers</a>
          <a href="https://docs.requestly.com/general/http-rules--rule-types/modify-response-body" target="_blank" rel="noreferrer noopener">Modify Response Rule</a>
          <a href="https://docs.requestly.com/general/http-rules--rule-types/modify-dominject-scripts" target="_blank" rel="noreferrer noopener">Inject Javascript or CSS to any website</a>
          <a href="https://docs.requestly.com/general/rule-types/replace-strings" target="_blank" rel="noreferrer noopener">Conditionally replace part of an URL String</a>
          <a href="https://docs.requestly.com/general/rule-types/modify-user-agents" target="_blank" rel="noreferrer noopener">Modify User Agent</a>
          <a href="https://docs.requestly.com/general/others/sharing-rules" target="_blank" rel="noreferrer noopener">Share your Rules</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
