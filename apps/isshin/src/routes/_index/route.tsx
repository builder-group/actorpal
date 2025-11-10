import React from 'react';
import { Link } from 'react-router';

const Page: React.FC = () => {
	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-4xl">
				<h1 className="mb-8 text-3xl font-bold text-gray-900">Isshin</h1>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Link
						to="/monitor"
						className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
					>
						<h2 className="mb-2 text-xl font-semibold text-gray-900">Process Monitor</h2>
						<p className="text-gray-600">View and manage running processes</p>
					</Link>
					<Link
						to="/block-sites"
						className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
					>
						<h2 className="mb-2 text-xl font-semibold text-gray-900">Block Websites</h2>
						<p className="text-gray-600">Block distracting websites like SelfControl</p>
					</Link>
				</div>
			</div>
		</div>
	);
};

export default Page;
