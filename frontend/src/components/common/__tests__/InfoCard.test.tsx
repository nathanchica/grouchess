import { render } from 'vitest-browser-react';

import InfoCard from '../InfoCard';

describe('InfoCard', () => {
    it('renders correctly', async () => {
        const { getByText } = await render(
            <InfoCard>
                <p>Hello!</p>
            </InfoCard>
        );
        await expect.element(getByText('Hello!')).toBeInTheDocument();
    });
});
