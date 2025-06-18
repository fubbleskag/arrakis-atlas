import { AuthButton } from '@/components/auth/AuthButton';

export function AppHeader() {
  return (
    <header className="py-4 px-6 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-headline font-semibold text-primary">
          Arrakis Atlas
        </h1>
        <AuthButton />
      </div>
    </header>
  );
}
