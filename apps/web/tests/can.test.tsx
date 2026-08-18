import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { Can } from "@/components/auth/can";
import { authReducer, authSucceeded, setInitialized } from "@/features/auth/authSlice";

function createStore(permissions: string[]) {
    const store = configureStore({
        reducer: {
            auth: authReducer,
        },
    });

    store.dispatch(setInitialized(true));
    store.dispatch(
        authSucceeded({
            user: {
                id: "u1",
                name: "Kristian",
                email: "user@example.com",
                emailVerified: false,
                roles: ["user"],
                permissions,
            },
            accessToken: "token",
        }),
    );

    return store;
}

describe("<Can>", () => {
    it("renders children when permission exists", () => {
        const store = createStore(["users.update"]);
        render(
            <Provider store={store}>
                <Can permission="users.update">
                    <button>Edit user</button>
                </Can>
            </Provider>,
        );

        expect(screen.getByText("Edit user")).toBeInTheDocument();
    });

    it("hides children when permission is missing", () => {
        const store = createStore(["sites.view"]);
        render(
            <Provider store={store}>
                <Can permission="users.update">
                    <button>Edit user</button>
                </Can>
            </Provider>,
        );

        expect(screen.queryByText("Edit user")).not.toBeInTheDocument();
    });
});
