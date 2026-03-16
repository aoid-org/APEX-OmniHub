const fs = require('fs');
const path = 'tests/omnidash/dashboard-overview-wiring.test.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace Orchestrator -> QuickBooks
content = content.replace(/Orchestrator/g, 'QuickBooks');

// Replace the fortress test
content = content.replace(
`  it('navigates to fortress route when clicking a Live integration tile', () => {`,
`  it('triggers UniversalModalEngine oauth flow when clicking a Live integration tile (since integrations do not route internally)', () => {`
);

content = content.replace(/Fortress/g, 'Slack');
content = content.replace(
`    expect(mockNavigate).toHaveBeenCalledWith('/omnidash/fortress');
    const modalState = useOmniModal.getState();
    expect(modalState.isOpen).toBe(false);`,
`    expect(mockNavigate).not.toHaveBeenCalled();
    const modalState = useOmniModal.getState();
    expect(modalState.isOpen).toBe(true);
    expect(modalState.activeModal?.type).toBe('oauth');`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched');
