'use client';

import QRCodeStyling, { type Options } from 'qr-code-styling';
import { useEffect, useMemo, useRef } from 'react';
import { useDeepCompareEffect } from 'react-use';

export interface QRCodeProps
	extends Options,
		React.HTMLAttributes<HTMLDivElement> {}

export function QRCode(props: QRCodeProps): JSX.Element {
	const qrCode = useMemo(
		() =>
			new QRCodeStyling({
				shape: 'square',
				type: 'svg',
				...props,
				dotsOptions: {
					type: 'extra-rounded',
					...props.dotsOptions,
				},
				cornersDotOptions: {
					type: 'dot',
					...props.cornersDotOptions,
				},
				cornersSquareOptions: {
					type: 'dot',
					...props.cornersSquareOptions,
				},
				qrOptions: {
					mode: 'Byte',
					errorCorrectionLevel: 'L',
					...props.qrOptions,
				},
			}),
		[],
	);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (ref.current) {
			qrCode.append(ref.current);
		}
	}, [qrCode, ref]);

	useDeepCompareEffect(() => {
		qrCode.update(props);
	}, [props]);

	return <div ref={ref} className="qrcode" />;
}
