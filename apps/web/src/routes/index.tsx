import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎒 Bag of Holding
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your Magic: The Gathering collection manager
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Welcome to your collection!
            </h2>
            <p className="text-blue-700">
              Import your Helvault export to browse collections, compare
              decklists, see owned vs missing cards, and discover alternate
              printings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}