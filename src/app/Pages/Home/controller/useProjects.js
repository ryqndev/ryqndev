import { useEffect, useState, useCallback } from 'react';

const useProjects = (y, ref) => {
	const [project, _setProject] = useState(0);

	useEffect(() => {
		_setProject(
			~~(
				(y -
					ref.current?.getBoundingClientRect().top -
					window.innerHeight) /
				window.innerHeight
			)
		);
	}, [ref, y]);

	const setProject = useCallback(
		projectid => {
			window.scrollTo({
				top:
					projectid * (window.innerHeight / 2) +
					ref.current.offsetTop,
				behavior: 'smooth',
			});
		},
		[ref]
	);

	return {
		project,
		setProject,
	};
};

export default useProjects;
