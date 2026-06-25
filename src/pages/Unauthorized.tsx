export default function Unauthorized() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Unauthorized</h1>
        <p>You do not have permission to view this page.</p>
        <a href="/" className="text-blue-600 underline">Go back home</a>
      </div>
    </div>
  );
}
