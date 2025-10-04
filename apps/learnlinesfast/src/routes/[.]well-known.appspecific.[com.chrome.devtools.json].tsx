import path from 'path';

// https://stackoverflow.com/questions/79629915/well-known-appspecific-com-chrome-devtools-json-request
export const loader = async () => {
	const projectRoot = path.resolve();
	const jsonData = {
		workspace: {
			root: projectRoot,
			uuid: 'my-uuid-xxx'
		}
	};
	return Response.json(jsonData);
};
