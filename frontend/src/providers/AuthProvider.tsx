import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import invariant from 'tiny-invariant';

type AuthData = {
    roomId: string | null;
    playerId: string | null;
    token: string | null;
};

export type AuthContextType = AuthData & {
    loadData: (authData: AuthData) => void;
    clearAuth: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    invariant(context, 'useAuth must be used within AuthProvider');
    return context;
}

type Props = {
    children: ReactNode;
};

function AuthProvider({ children }: Props) {
    const [authData, setAuthData] = useState<AuthData>({
        roomId: null,
        playerId: null,
        token: null,
    });

    const loadData = useCallback((data: AuthData) => {
        setAuthData(data);
    }, []);

    const clearAuth = useCallback(() => {
        setAuthData({
            roomId: null,
            playerId: null,
            token: null,
        });
    }, []);

    const value = useMemo(() => ({ ...authData, loadData, clearAuth }), [authData, loadData, clearAuth]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
