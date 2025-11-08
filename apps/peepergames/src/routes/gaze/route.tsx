import React from 'react';
import { GazeExpression } from '@/features/gaze-expression';

const Page: React.FC = () => {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-900">
			<div className="text-center">
				<h1 className="mb-4 text-4xl font-bold text-white">Gaze Expression</h1>
				<p className="mb-8 text-gray-400">Move your cursor around to see the expression follow</p>
				<GazeExpression spriteMap={spriteMap} size={400} />
			</div>
		</div>
	);
};

export default Page;

const spriteMap = [
	[
		{
			filename: 'sprite_5x5_x0y0.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/c1mY6HTQAGKeC6i7VhtGhV4GNEdI6F3M1ofyUqBXSefTrBdWB/expression_edit_preview25.webp',
			width: 512,
			height: 512,
			spriteSheetX: 0,
			spriteSheetY: 0
		},
		{
			filename: 'sprite_5x5_x1y0.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/1MlxDT6hQFL6L5JzfHRZcQlvRpoPMwhp401STPRSc1ThNozKA/expression_edit_preview38.webp',
			width: 512,
			height: 512,
			spriteSheetX: 512,
			spriteSheetY: 0
		},
		{
			filename: 'sprite_5x5_x2y0.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/7WPAq3yC9m56JtjhA0hstelpt1pZTJQkw32eVIjfrHVl1gOrA/expression_edit_preview23.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1024,
			spriteSheetY: 0
		},
		{
			filename: 'sprite_5x5_x3y0.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/AfGOfnQXcNmC7UKfJK7D6YJFuoHYMrCdiyWcP8pIxulz1gOrA/expression_edit_preview29.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1536,
			spriteSheetY: 0
		},
		{
			filename: 'sprite_5x5_x4y0.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/qwBsWAsitRJ0FJA9OBUahp92QxSF0bWslGnGHl0ST55wG0ZF/expression_edit_preview39.webp',
			width: 512,
			height: 512,
			spriteSheetX: 2048,
			spriteSheetY: 0
		}
	],
	[
		{
			filename: 'sprite_5x5_x0y1.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/SLWdTzeF67TufEvar5Lmw80C6GylLRPtdYqnpGKya5cFbQnVA/expression_edit_preview41.webp',
			width: 512,
			height: 512,
			spriteSheetX: 0,
			spriteSheetY: 512
		},
		{
			filename: 'sprite_5x5_x1y1.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/5TFlaeHi7kxuICfVVdsVvSKI0tWeBbKLvBQNvxCES3Cm1gOrA/expression_edit_preview24.webp',
			width: 512,
			height: 512,
			spriteSheetX: 512,
			spriteSheetY: 512
		},
		{
			filename: 'sprite_5x5_x2y1.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/SuZmb6iFgcqeHirYRzI44STWlhl2Awqre2zOMDwxeDcs1gOrA/expression_edit_preview26.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1024,
			spriteSheetY: 512
		},
		{
			filename: 'sprite_5x5_x3y1.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/sGk8eeeh1hUZvpfu4pGeevGwR86j7cPApu001VaNdUibyG0ZF/expression_edit_preview46.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1536,
			spriteSheetY: 512
		},
		{
			filename: 'sprite_5x5_x4y1.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/Sjwwr6Jb0k6eVqzTkXWwfYAQCAeytOH5uQRnice9Vz6irBdWB/expression_edit_preview28.webp',
			width: 512,
			height: 512,
			spriteSheetX: 2048,
			spriteSheetY: 512
		}
	],
	[
		{
			filename: 'sprite_5x5_x0y2.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/EyVQHPU2Dj7fSS72da5skZmxeu3n1q9Z4lWeUQ5CpblD2gOrA/expression_edit_preview37.webp',
			width: 512,
			height: 512,
			spriteSheetX: 0,
			spriteSheetY: 1024
		},
		{
			filename: 'sprite_5x5_x1y2.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/mzsrPaqCgSKcDpmiMmxGW9lfSMSd486PJVh9s7Y499kkNozKA/expression_edit_preview47.webp',
			width: 512,
			height: 512,
			spriteSheetX: 512,
			spriteSheetY: 1024
		},
		{
			filename: 'sprite_5x5_x2y2.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/CWpLmfkCBJysXSXHfnnu7jef1Tc0XNG2CQfJRg2Rkd2cXD6sC/expression_edit_preview31.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1024,
			spriteSheetY: 1024
		},
		{
			filename: 'sprite_5x5_x3y2.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/cJofjfv99Ajf9IIdpbybQQ54BWxERPYRt6g2TmEbVnEfrBdWB/expression_edit_preview35.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1536,
			spriteSheetY: 1024
		},
		{
			filename: 'sprite_5x5_x4y2.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/EJ3dKIAzPa4BP1TfAw6eZbIOw55W22ZqfCmyegg8EgQjrBdWB/expression_edit_preview27.webp',
			width: 512,
			height: 512,
			spriteSheetX: 2048,
			spriteSheetY: 1024
		}
	],
	[
		{
			filename: 'sprite_5x5_x0y3.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/GPjXdVKpEvLSKJKifrgPqfzCsIdUKnvGMQlakA8f2C0O2gOrA/expression_edit_preview43.webp',
			width: 512,
			height: 512,
			spriteSheetX: 0,
			spriteSheetY: 1536
		},
		{
			filename: 'sprite_5x5_x1y3.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/Dsfhf2xkxhli3UfPe7FZiuz4LffuGZ4L8xLgU5qfa7UGjNozKA/expression_edit_preview42.webp',
			width: 512,
			height: 512,
			spriteSheetX: 512,
			spriteSheetY: 1536
		},
		{
			filename: 'sprite_5x5_x2y3.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/BeHCi0D7HevITECfdXNHj976578I5aEFeRAJQXm556usrBdWB/expression_edit_preview32.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1024,
			spriteSheetY: 1536
		},
		{
			filename: 'sprite_5x5_x3y3.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/EZQqF8bQCEpxN5E9EZC5Ho7Xj2056Uv229EDMFDaU5LyG0ZF/expression_edit_preview44.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1536,
			spriteSheetY: 1536
		},
		{
			filename: 'sprite_5x5_x4y3.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/d8uAqCeJla0JIi3GnzXtTnat5zexA18PTWcAM1kQBN0EbQnVA/expression_edit_preview40.webp',
			width: 512,
			height: 512,
			spriteSheetX: 2048,
			spriteSheetY: 1536
		}
	],
	[
		{
			filename: 'sprite_5x5_x0y4.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/iJJ7OJposf2tAqf3NzyIb8MJWNNLO2Xy3kifUbmz1F6C2gOrA/expression_edit_preview36.webp',
			width: 512,
			height: 512,
			spriteSheetX: 0,
			spriteSheetY: 2048
		},
		{
			filename: 'sprite_5x5_x1y4.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/5ZqfzRfuOToevo156Fjr0iGtVqh46ls7MZ7mNCh7tmuy1gOrA/expression_edit_preview30.webp',
			width: 512,
			height: 512,
			spriteSheetX: 512,
			spriteSheetY: 2048
		},
		{
			filename: 'sprite_5x5_x2y4.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/x4LTsMOPRMa2L9vLaG11U3ZR0qc4HfjvmpRft2yXUko9aQnVA/expression_edit_preview34.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1024,
			spriteSheetY: 2048
		},
		{
			filename: 'sprite_5x5_x3y4.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/NaTL5ak8GKbnMhWcpJwBG2RfwXCDN2WDceyokOhbRfLQ2gOrA/expression_edit_preview45.webp',
			width: 512,
			height: 512,
			spriteSheetX: 1536,
			spriteSheetY: 2048
		},
		{
			filename: 'sprite_5x5_x4y4.webp',
			spriteUrl:
				'https://replicate.delivery/xezq/CNjYfelXFUisYkuxiMKiJ0plqZyg0BH2u6vmAPboaz69aQnVA/expression_edit_preview33.webp',
			width: 512,
			height: 512,
			spriteSheetX: 2048,
			spriteSheetY: 2048
		}
	]
];
