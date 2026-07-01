/**
 * AUDIT-304 shell-batch render + source test.
 *
 * Verification artifact for the SHELL-global visual/UX fixes. Every target surface sits behind
 * <ProtectedRoute> and this branch deliberately requires login, so a live offline screenshot pass
 * is not possible. Instead this mounts the self-contained pieces (Logo, ProfilePage against a
 * mocked auth user) and asserts the rest at source (Toast width, dead toasts, SSO, breadcrumb map,
 * search clear-on-route, notification single-source) - the same split used by audit303.labels.test.
 *
 * Convention: react-dom/client + react-dom/test-utils act, NO React Testing Library (RTL is
 * intentionally absent from this project - matches primitives.regression.test.tsx / audit303.labels).
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// Inject a signed-in user so ProfilePage renders against real identity (the point of the fix),
// rather than the previously-hardcoded "Dr. Sarah Williams".
jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    state: {
      user: {
        email: 'g.house@ppth.org',
        firstName: 'Gregory',
        lastName: 'House',
        title: 'Chief of Diagnostics',
        role: 'HOSPITAL_ADMIN',
        department: 'Diagnostic Medicine',
      },
    },
  }),
}));

import Logo from '../../components/TailrdLogo';
import ProfilePage from '../../ui/ProfilePage';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(el: React.ReactElement): string {
  act(() => {
    root.render(el);
  });
  return container.innerHTML;
}

function src(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
}

// ------------------------- Logo (rendered) -------------------------
describe('AUDIT-304 Logo - image on login only, chrome wordmark in-app', () => {
  it('full variant renders the real <img> asset (the LOGIN treatment)', () => {
    const html = render(<Logo variant="full" />);
    expect(html).toContain('<img');
    expect(html).toContain('tailrd-heart-logo.png');
    expect(html).toContain('alt="TAILRD | HEART"');
  });
  it('wordmark on a light surface renders chrome gradient text (TAILRD | HEART), never an <img>', () => {
    const html = render(<Logo variant="wordmark" surface="light" />);
    expect(html).toContain('TAILRD');
    expect(html).toContain('HEART');
    expect(html).not.toContain('<img'); // chrome text, never the boxed raster
  });
  it('wordmark on the dark surface also renders chrome text, no <img>', () => {
    const html = render(<Logo variant="wordmark" surface="dark" />);
    expect(html).toContain('TAILRD');
    expect(html).toContain('HEART');
    expect(html).not.toContain('<img');
  });
  it('renders the optional tagline when provided', () => {
    const html = render(<Logo variant="full" tagline="Cardiovascular Intelligence Platform" />);
    expect(html).toContain('Cardiovascular Intelligence Platform');
  });
});

// -------------- Logo render-site policy (source): image on login only --------------
describe('AUDIT-304 Logo render sites - image on login only, wordmark everywhere in-app', () => {
  it('Login uses the image (variant="full"), the only full site', () => {
    expect(src('../../components/Login.tsx')).toContain('variant="full"');
  });
  it('App in-app loaders use the wordmark; the dashboard hero logo + tagline are removed', () => {
    const s = src('../../App.tsx');
    expect(s).toContain('variant="wordmark"');                        // loaders still use the wordmark
    expect(s).not.toContain('variant="full"');                        // no raster image in-app
    expect(s).not.toContain('Cardiovascular Intelligence Platform');  // dashboard hero removed entirely
  });
  it('sidebar uses the wordmark', () => {
    expect(src('../Sidebar.tsx')).toContain('variant="wordmark"');
  });
  it('admin + auth in-app surfaces use the wordmark, not the image', () => {
    expect(src('../../ui/admin/SuperAdminDashboard.tsx')).not.toContain('variant="full"');
    expect(src('../../ui/auth/AcceptInvite.tsx')).not.toContain('variant="full"');
    expect(src('../../ui/auth/SuperAdminLogin.tsx')).not.toContain('variant="full"');
  });
});

// -------------- Wordmark treatment (source): clip-order fix + bg-aware legibility --------------
describe('AUDIT-304 wordmark treatment - color-block fix + background-aware colors', () => {
  const s = src('../../components/TailrdLogo.tsx');
  it('sets the background shorthand BEFORE background-clip (avoids the color-block artifact)', () => {
    const bgIdx = s.indexOf('background: gradient');
    const clipIdx = s.indexOf('WebkitBackgroundClip');
    expect(bgIdx).toBeGreaterThan(-1);
    expect(clipIdx).toBeGreaterThan(-1);
    expect(bgIdx).toBeLessThan(clipIdx);
  });
  it('provides a background-aware color set for both dark and light surfaces', () => {
    expect(s).toContain('WORDMARK_COLORS');
    expect(s).toContain('linear-gradient'); // chrome/arterial gradient text
    expect(s).toMatch(/dark:\s*\{/);
    expect(s).toMatch(/light:\s*\{/);
  });
});

// ------------------------- ProfilePage (rendered, mocked user) -------------------------
describe('AUDIT-304 ProfilePage - identity from useAuth, credentials honest', () => {
  it('renders the signed-in user, not the hardcoded Sarah Williams', () => {
    const html = render(<ProfilePage />);
    expect(html).toContain('Gregory House'); // wired: name
    expect(html).toContain('g.house@ppth.org'); // wired: email
    expect(html).toContain('Diagnostic Medicine'); // wired: department
    expect(html).toContain('Chief of Diagnostics'); // wired: title
    expect(html).toContain('GH'); // wired: initials
    expect(html).not.toContain('Sarah Williams');
  });
  it('shows an honest interim state for credentials not on the auth record', () => {
    const html = render(<ProfilePage />);
    expect(html).toContain('Not on file');
    expect(html).not.toContain('1234567890'); // old fabricated NPI
    expect(html).not.toContain('ABIM'); // old fabricated board certification
  });
});

// ------------------------- Toast width (source) -------------------------
describe('AUDIT-304 Toast - viewport-capped width (fixes the off-screen clipping class)', () => {
  const s = src('../../components/shared/Toast.tsx');
  it('card uses the viewport-capped width class', () => {
    expect(s).toContain('w-[min(24rem,calc(100vw-2rem))]');
  });
  it('no longer uses the overflow-prone max-w-sm w-full', () => {
    expect(s).not.toContain('max-w-sm w-full');
  });
  it('long content wraps within the cap (min-w-0 + break-words), not clipped', () => {
    expect(s).toContain('min-w-0'); // flex text column can shrink below intrinsic width
    expect(s).toContain('break-words'); // title + message wrap instead of overflowing
  });
  it('card enter/leave is vertical-only - no off-screen horizontal slide at rest', () => {
    expect(s).not.toContain('translate-x-full'); // the off-screen-right slide class is removed
    expect(s).toContain('translate-y-0'); // rests aligned inside its container
    expect(s).toContain('translate-y-2'); // enter/leave offset is a small vertical nudge, never horizontal
  });
});

// ------------------------- dead toasts removed (source) -------------------------
describe('AUDIT-304 dead controls removed', () => {
  it('Login: no redundant post-login success toast', () => {
    const s = src('../../components/Login.tsx');
    expect(s).not.toContain("toast.success('Login Successful'");
  });
  it('SuperAdminLogin: no redundant post-login success toast', () => {
    const s = src('../../ui/auth/SuperAdminLogin.tsx');
    expect(s).not.toContain("toast.success('Login Successful'");
  });
  it('UserMenu: Recent Activity dead menu item removed', () => {
    const s = src('../../components/UserMenu.tsx');
    expect(s).not.toContain('Recent Activity');
  });
  it('Login SSO button is inert (no navigation to the unconfigured /api/sso/login)', () => {
    const s = src('../../components/Login.tsx');
    expect(s).not.toContain('/api/sso/login');
    expect(s).toContain('SSO is not yet configured');
  });
});

// ------------------------- Login copy trim (source) -------------------------
describe('AUDIT-304 Login copy trim - filler removed, essentials kept', () => {
  const s = src('../../components/Login.tsx');
  it('removes the subheading and footer filler lines', () => {
    expect(s).not.toContain('Access your cardiovascular analytics dashboard');
    expect(s).not.toContain('Secure access for authorized cardiovascular care teams');
  });
  it('keeps the logo image, tagline, Sign In, and SSO', () => {
    expect(s).toContain('variant="full"'); // logo image (login only)
    expect(s).toContain('Cardiovascular Intelligence Platform'); // tagline
    expect(s).toContain('Sign In'); // heading + submit button
    expect(s).toContain('health system SSO'); // SSO button
  });
});

// ------------------------- breadcrumb map (source) -------------------------
describe('AUDIT-304 breadcrumb - profile/settings/patients/data/research resolve to names', () => {
  const s = src('../AppShell.tsx');
  ['profile', 'settings', 'patients', 'data', 'research'].forEach((key) => {
    it(`MODULE_NAME_MAP has an entry for "${key}"`, () => {
      expect(s).toContain(`${key}:`);
    });
  });
  it('includes the human-readable labels', () => {
    expect(s).toContain("'Data Management'");
    expect(s).toContain("'Clinical Research'");
  });
});

// ------------------------- search clear-on-route (source) -------------------------
describe('AUDIT-304 search - clears on route change', () => {
  it('TopBar clears searchQuery when location.pathname changes', () => {
    const s = src('../TopBar.tsx');
    expect(s).toContain('location.pathname');
    expect(s).toContain("setSearchQuery('')");
  });
});

// ------------------------- notification single-source (source) -------------------------
describe('AUDIT-304 notifications - bell/menu/panel read one shared unread count', () => {
  it('TopBar bell renders the shared unreadCount, not a static demo dot', () => {
    const s = src('../TopBar.tsx');
    expect(s).toContain('useNotifications');
    expect(s).toContain('{unreadCount}');
  });
  it('UserMenu badge is derived from unreadCount, not the hardcoded "3"', () => {
    const s = src('../../components/UserMenu.tsx');
    expect(s).toContain('useNotifications');
    expect(s).not.toContain("badge: '3'");
  });
  it('NotificationPanel consumes the shared provider', () => {
    const s = src('../../components/notifications/NotificationPanel.tsx');
    expect(s).toContain('useNotifications');
  });
});
