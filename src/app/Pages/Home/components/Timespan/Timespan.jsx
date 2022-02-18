import cn from './Timespan.module.scss';

const dateDisplayOptions = {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
};

function Timespan({ start, end }) {
	return (
		<aside className={cn.container}>
			{new Date(start).toLocaleDateString(
				navigator.languages[0],
				dateDisplayOptions
			)}
			<span>⎯⎯⎯⎯⎯⎯⎯⎯</span>
			{end
				? new Date(end).toLocaleDateString(
						navigator.languages[0],
						dateDisplayOptions
				  )
				: 'Present'}
		</aside>
	);
}

export default Timespan;
