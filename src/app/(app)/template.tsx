// Templates remount on every navigation, so this fires the entrance animation
// each time you move between pages in the app.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
