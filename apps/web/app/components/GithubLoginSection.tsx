import { useSession } from "next-auth/react";

const YourComponent = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    return <p>You are not logged in</p>;
  }

  // Access the token
  const accessToken = session.user.githubAccessToken;

  // Use the access token to make an API call
  const fetchData = async () => {
    const response = await fetch("http://localhost:3000/api/github", {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch data:", response.statusText);
    } else {
      const data = await response.json();
      console.log(data);
    }
  };

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <button onClick={fetchData}>Fetch GitHub Data</button>
    </div>
  );
};

export default YourComponent;
