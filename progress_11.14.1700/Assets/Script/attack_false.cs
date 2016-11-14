using UnityEngine;
using System.Collections;

public class attack_false : StateMachineBehaviour {

	override public void OnStateEnter(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
	{
		animator.SetBool("attack", false);
		animator.SetBool ("moveable", false);
		animator.SetBool ("moveing", false);
	}
	override public void OnStateExit(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
	{
		animator.SetBool ("moveable", true);
	}	
}
