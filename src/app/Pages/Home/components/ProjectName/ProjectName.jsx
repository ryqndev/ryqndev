import cn from './ProjectName.module.scss';

function ProjectName({ name }) {
	return (
		<aside className={cn.container}>
			<p>
				• •<span>{name}</span>
				⎯⎯⎯⎯⎯⎯⎯
				{/* ⎯⎯⎯⎯⎯⎯⎯ */}
			</p>
		</aside>
	);
}

export default ProjectName;
