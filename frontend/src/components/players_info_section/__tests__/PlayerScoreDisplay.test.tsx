import type { PieceColor } from '@grouchess/models';
import { render } from 'vitest-browser-react';

import PlayerScoreDisplay from '../PlayerScoreDisplay';

describe('PlayerScoreDisplay', () => {
    describe('rendering variants', () => {
        it.each([
            {
                scenario: 'white color',
                name: 'Alice',
                color: 'white' as PieceColor,
                score: 5,
                expectedScoreText: '(5)',
            },
            {
                scenario: 'black color',
                name: 'Bob',
                color: 'black' as PieceColor,
                score: 3,
                expectedScoreText: '(3)',
            },
        ])('renders player name and score for $scenario', async ({ name, color, score, expectedScoreText }) => {
            const { getByText } = await render(<PlayerScoreDisplay name={name} color={color} score={score} />);

            // Verify player name is displayed
            await expect.element(getByText(name)).toBeInTheDocument();

            // Verify score display
            await expect.element(getByText(expectedScoreText)).toBeInTheDocument();
        });

        it.each([
            {
                scenario: 'white color',
                name: 'Charlie',
                color: 'white' as PieceColor,
            },
            {
                scenario: 'black color',
                name: 'Diana',
                color: 'black' as PieceColor,
            },
        ])('renders player name without score for $scenario', async ({ name, color }) => {
            const { getByText } = await render(<PlayerScoreDisplay name={name} color={color} score={undefined} />);

            // Verify player name is displayed
            await expect.element(getByText(name)).toBeInTheDocument();

            // Verify score is not displayed
            await expect.element(getByText(/\(\d+\)/)).not.toBeInTheDocument();
        });

        it('hides score when undefined', async () => {
            const { getByText } = await render(<PlayerScoreDisplay name="Bob" color="black" />);

            await expect.element(getByText(/\(\d+\)/)).not.toBeInTheDocument();
        });

        it.each([
            {
                scenario: 'white color',
                name: 'Eve',
                color: 'white' as PieceColor,
            },
            {
                scenario: 'black color',
                name: 'Frank',
                color: 'black' as PieceColor,
            },
        ])('adds title attribute to name element for $scenario', async ({ name, color }) => {
            const { getByTitle } = await render(<PlayerScoreDisplay name={name} color={color} />);

            await expect
                .element(getByTitle(`${color === 'white' ? 'White' : 'Black'} player: ${name}`))
                .toBeInTheDocument();
        });

        it('renders all expected elements', async () => {
            const { getByText, getByTitle } = await render(
                <PlayerScoreDisplay name="TestPlayer" color="black" score={10} />
            );

            // Verify player name
            await expect.element(getByText('TestPlayer')).toBeInTheDocument();

            // Verify score
            await expect.element(getByText('(10)')).toBeInTheDocument();

            // Verify chess king icon (SVG)
            await expect.element(getByTitle('Player color icon')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('handles score of zero', async () => {
            const { getByText } = await render(<PlayerScoreDisplay name="Alice" color="white" score={0} />);

            await expect.element(getByText('(0)')).toBeInTheDocument();
        });

        it('handles large score values', async () => {
            const { getByText } = await render(<PlayerScoreDisplay name="Bob" color="black" score={999} />);

            await expect.element(getByText('(999)')).toBeInTheDocument();
        });

        it('handles empty name string', async () => {
            const { getByText, getByTitle } = await render(<PlayerScoreDisplay name="" color="white" score={5} />);

            // The score should still be rendered
            await expect.element(getByText('(5)')).toBeInTheDocument();

            // The name element should still exist with empty title attribute
            await expect.element(getByTitle(`White player: `)).toBeInTheDocument();
        });

        it('handles special characters in name', async () => {
            const specialName = "Player's Name <Test> & More";
            const { getByText, getByTitle } = await render(
                <PlayerScoreDisplay name={specialName} color="black" score={5} />
            );

            await expect.element(getByText(specialName)).toBeInTheDocument();
            await expect.element(getByTitle(`Black player: ${specialName}`)).toBeInTheDocument();
        });
    });
});
