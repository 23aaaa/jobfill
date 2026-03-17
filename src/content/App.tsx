import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarContainer } from '@/containers/SidebarContainer';

export function App() {
  return (
    <ThemeProvider>
      <SidebarContainer />
    </ThemeProvider>
  );
}
