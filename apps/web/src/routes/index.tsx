import { createFileRoute, Link } from '@tanstack/react-router';

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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Welcome to your collection!
            </h2>
            <p className="text-blue-700">
              Import your Helvault export to browse collections, compare
              decklists, see owned vs missing cards, and discover alternate
              printings.
            </p>
          </div>
          
          {/* Test Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-900 mb-2">
              🧪 Test the Helvault Importer
            </h2>
            <p className="text-green-700 mb-4">
              Try out the SQLite importer with your own .helvault file or use our test fixture.
            </p>
            <div className="space-y-3">
              <Link
                to="/test"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Open Test Page →
              </Link>
              <div className="text-sm text-green-600">
                <a 
                  href="/test.helvault" 
                  download
                  className="underline hover:text-green-800"
                >
                  Download test .helvault file
                </a> to try the importer
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}