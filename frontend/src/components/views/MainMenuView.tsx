import { useEffect } from 'react';

function MainMenuView() {
    useEffect(() => {
        // Fetch supported time controls from the API
        const fetchTimeControls = async () => {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/time-control`);
            const data = await response.json();
            // For demonstration purposes, we just log the data. This will be removed later.
            console.log(data); // eslint-disable-line no-console
        };

        fetchTimeControls();
    }, []);

    return <div>Main Menu</div>;
}

export default MainMenuView;
