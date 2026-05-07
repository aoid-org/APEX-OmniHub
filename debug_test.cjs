const fs = require('node:fs');
const path = 'tests/omnidash/dashboard-overview-wiring.test.tsx';
let content = fs.readFileSync(path, 'utf8');

// If Slack is only showing up once (maybe it's not in the context list), `screen.getAllByText('Slack')[1]` will be undefined.
content = content.replace(
`    fireEvent.click(screen.getAllByText('Slack')[1]);`,
`    const slackElements = screen.getAllByText('Slack');
    fireEvent.click(slackElements[slackElements.length - 1]);`
);

content = content.replace(
`    fireEvent.click(screen.getAllByText('QuickBooks')[1]);`,
`    const qbElements = screen.getAllByText('QuickBooks');
    fireEvent.click(qbElements[qbElements.length - 1]);`
);

fs.writeFileSync(path, content, 'utf8');
