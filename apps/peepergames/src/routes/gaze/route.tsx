import React from 'react';
import { GazeExpression } from '@/features/gaze-expression';

const Page: React.FC = () => {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-900">
			<div className="text-center">
				<h1 className="mb-4 text-4xl font-bold text-white">Gaze Expression</h1>
				<p className="mb-8 text-gray-400">Move your cursor around to see the expression follow</p>
				<GazeExpression atlas={atlas} size={400} />
			</div>
		</div>
	);
};

export default Page;

const atlas = [
	[
		{
			filename: 'grid_3x3_x0y0.webp',
			url: 'https://replicate.delivery/xezq/Fn8cQNDmsJrxPh0FgQ5BU7bsUOKqLBItfYo4nfX2xPuBnPnVA/expression_edit_preview125.webp'
		},
		{
			filename: 'grid_3x3_x1y0.webp',
			url: 'https://replicate.delivery/xezq/DaNr1XV148JUL1wx7UKotHztSuuttI2CLCAqDw9wEKMv5zZF/expression_edit_preview120.webp'
		},
		{
			filename: 'grid_3x3_x2y0.webp',
			url: 'https://replicate.delivery/xezq/aaEpCU774iKsLh4runrK21fpf4E25JKPXEMAFt3i2nXfNfcWB/expression_edit_preview123.webp'
		}
	],
	[
		{
			filename: 'grid_3x3_x0y1.webp',
			url: 'https://replicate.delivery/xezq/6zFPEcEMVhYfbaSORtXitEpA0OEVgqmrsHoErrdz4eN3mPnVA/expression_edit_preview116.webp'
		},
		{
			filename: 'grid_3x3_x1y1.webp',
			url: 'https://replicate.delivery/xezq/ldeWTtiM7GWZNKWiPnhqkflC8fJNHvaJpuikM5NsXjZsNfcWB/expression_edit_preview115.webp'
		},
		{
			filename: 'grid_3x3_x2y1.webp',
			url: 'https://replicate.delivery/xezq/uLNl36Awgf1PbCDtoImJ3b4pOnIhJmoAe1BNQuGvn4NCnPnVA/expression_edit_preview126.webp'
		}
	],
	[
		{
			filename: 'grid_3x3_x0y2.webp',
			url: 'https://replicate.delivery/xezq/0pko6KGDENrwL1sySrKS5HaqLLxr2EYnLf0N7iRjUEtZznzKA/expression_edit_preview113.webp'
		},
		{
			filename: 'grid_3x3_x1y2.webp',
			url: 'https://replicate.delivery/xezq/5irh5hMuNOIyOVDIXtzcfhxALKSwWexCl5ctex40jea7be5sC/expression_edit_preview122.webp'
		},
		{
			filename: 'grid_3x3_x2y2.webp',
			url: 'https://replicate.delivery/xezq/9HAZvIiPmeUORSvt5wDGAib1Yvi4HpLflk6UIXMpg8L6mPnVA/expression_edit_preview118.webp'
		}
	]
];
