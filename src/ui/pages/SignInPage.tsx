import type { AuthState, SignInUserOption } from "../../db/repository";
import { HtmlDocument } from "../layout/HtmlDocument";

interface SignInPageProps {
  auth: AuthState;
  users: SignInUserOption[];
}

export function SignInPage(props: SignInPageProps) {
  const { auth, users } = props;
  const defaultUser = users.find((user) => user.id === auth.userId)?.id ?? users[0]?.id ?? "";

  return (
    <HtmlDocument title="OmUI Sign In">
      <main
        style={
          "min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: var(--theme-bg-canvas); color: var(--theme-text);"
        }
      >
        <section class="ui-card" style="width: min(560px, 100%);">
          <h1 class="ui-card__value" style="margin: 0;">
            OmUI Console
          </h1>
          <p class="ui-pageHeader__sub" style="margin-bottom: 16px;">
            Demo sign-in state is stored in SQLite for shared UI behavior.
          </p>

          {auth.signedIn ? (
            <div class="ui-alert" data-tone="success" style="margin-bottom: 16px;">
              Signed in as <strong>{auth.userName}</strong> ({auth.role}).
            </div>
          ) : (
            <div class="ui-alert" data-tone="info" style="margin-bottom: 16px;">
              You are currently signed out.
            </div>
          )}

          <form method="post" action="/signin" class="ui-formRow">
            <div class="ui-formRow">
              <label class="ui-formRow__label" for="signin-user-id">
                User
              </label>
              <select class="ui-select" id="signin-user-id" name="userId" required>
                {users.map((user) => (
                  <option value={user.id} selected={user.id === defaultUser}>
                    {user.fullName} - {user.roleTitle} ({user.appRole})
                  </option>
                ))}
              </select>
            </div>

            <div class="ui-formRow">
              <label class="ui-formRow__label" for="signin-provider">
                Provider
              </label>
              <select class="ui-select" id="signin-provider" name="provider">
                <option value="bi" selected={auth.provider === "bi"}>
                  BI
                </option>
                <option value="pm" selected={auth.provider === "pm"}>
                  PM
                </option>
                <option value="ticketing" selected={auth.provider === "ticketing"}>
                  Ticketing
                </option>
                <option value="approval" selected={auth.provider === "approval"}>
                  Approval
                </option>
              </select>
            </div>

            <div class="ui-formRow">
              <label class="ui-formRow__label" for="signin-tenant-id">
                Tenant
              </label>
              <input class="ui-input" id="signin-tenant-id" name="tenantId" value={auth.tenantId} />
            </div>

            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button class="ui-btn" type="submit">
                Sign in
              </button>
              {auth.signedIn ? (
                <a class="ui-btn ui-btn--ghost" href="/dashboard/overview">
                  Continue
                </a>
              ) : null}
            </div>
          </form>
        </section>
      </main>
    </HtmlDocument>
  );
}
