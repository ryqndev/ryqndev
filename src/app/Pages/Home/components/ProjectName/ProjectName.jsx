import cn from './ProjectName.module.scss';

function ProjectName({ name }) {
	return (
		<aside className={cn.container}>
			<span></span>
			{name}
		</aside>
	);
}

export default ProjectName;
