import { render } from 'vitest-browser-react';

import { StoredSettingsContext } from '../../../../providers/StoredSettingsProvider';
import { createMockStoredSettingsContextValues } from '../../../../providers/__mocks__/StoredSettingsProvider';
import MoveNotationControls from '../MoveNotationControls';

describe('MoveNotationControls', () => {
    const renderMoveNotationControls = (contextOverrides = {}) => {
        const contextValue = {
            ...createMockStoredSettingsContextValues(),
            ...contextOverrides,
        };
        return render(
            <StoredSettingsContext.Provider value={contextValue}>
                <MoveNotationControls />
            </StoredSettingsContext.Provider>
        );
    };

    it('renders notation style setting', async () => {
        const { getByRole, getByText } = await renderMoveNotationControls();

        await expect.element(getByText('Notation Style')).toBeInTheDocument();
        await expect.element(getByRole('group', { name: 'Move notation style' })).toBeInTheDocument();
    });

    it('displays correct initial value', async () => {
        const { getByRole } = await renderMoveNotationControls({ moveNotationStyle: 'san' });

        const sanButton = getByRole('button', { name: 'Text' });
        const figurineButton = getByRole('button', { name: 'Figurine' });

        await expect.element(sanButton).toHaveAttribute('aria-pressed', 'true');
        await expect.element(figurineButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('calls setSetting when clicking options', async () => {
        const setSetting = vi.fn();
        const { getByRole } = await renderMoveNotationControls({
            moveNotationStyle: 'figurine',
            setSetting,
        });

        const sanButton = getByRole('button', { name: 'Text' });
        await sanButton.click();

        expect(setSetting).toHaveBeenCalledWith('moveNotationStyle', 'san');
    });
});
