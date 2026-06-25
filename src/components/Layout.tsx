import Sidebar from './SideBar';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <Sidebar>{children}</Sidebar>;
};

export default Layout;