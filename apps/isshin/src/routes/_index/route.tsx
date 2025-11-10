import React from 'react';
import { Link } from 'react-router';

const Page: React.FC = () => {
	return (
		<div>
			<h1>Home Page</h1>
			<Link to="/monitor">Process Monitor</Link>
		</div>
	);
};

export default Page;
