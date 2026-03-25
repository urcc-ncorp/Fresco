import NetlifyBadge from '~/components/NetlifyBadge';
import { requireAppNotExpired } from '~/queries/appSettings';
import { requirePageAuth } from '~/utils/auth';
import { NavigationBar } from './_components/NavigationBar';

export const metadata = {
  title: 'Network Canvas Fresco - Dashboard',
  description: 'Fresco.',
};

export const dynamic = 'force-dynamic';

const Layout = async ({ children }: { children: React.ReactNode }) => {
  await requireAppNotExpired();
  await requirePageAuth();

  return (
    <>
      <NavigationBar />
      {children}
      <NetlifyBadge />
    </>
  );
};

export default Layout;
